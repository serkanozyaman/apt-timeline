# APT Timeline Backend
# FastAPI app that aggregates public CTI sources (MITRE ATT&CK + MISP Galaxy)
# and exposes normalized JSON suitable for a timeline & map (origin country).
#
# Endpoints:
#   GET /health                   → simple healthcheck
#   GET /groups                   → list of threat actors (from MISP Galaxy)
#   GET /campaigns                → raw MITRE campaigns (enriched with group mapping)
#   GET /timeline                 → normalized timeline events (filterable)
#   POST /refresh                 → force-refresh the cache (tip: protect behind a secret in prod)
#
# Query params on /timeline:
#   group: str            → exact or alias match (case-insensitive)
#   country: str          → e.g., "Russia", "China", "Unknown"
#   from_date: YYYY-MM-DD → inclusive lower bound using first_seen/last_seen
#   to_date:   YYYY-MM-DD → inclusive upper bound
#   limit: int            → default 500
#   sort:  str            → one of: date_asc | date_desc (default: date_desc)
#
# How it works
#   - Downloads MITRE enterprise-attack STIX bundle (contains campaigns, intrusion-sets, relationships)
#   - Downloads MISP Galaxy threat-actor cluster (contains group names, aliases, countries)
#   - Maps each campaign → attributed intrusion-set (APT group) using STIX relationships
#   - Enriches with country from MISP by matching group name or aliases
#
# Notes
#   - All sources are public; no API keys required.
#   - Caches in memory; auto-refreshes every 12 hours; POST /refresh to force.
#   - Add a reverse proxy + caching (e.g., Cloudflare) in production.

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

import httpx
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

APP_NAME = "apt-timeline-backend"
MITRE_ENTERPRISE_URL = (
    "https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json"
)
MISP_GALAXY_TA_URL = (
    "https://raw.githubusercontent.com/MISP/misp-galaxy/main/clusters/threat-actor.json"
)

REFRESH_INTERVAL_SECONDS = 12 * 60 * 60  # 12h
HTTP_TIMEOUT = 60  # seconds

app = FastAPI(title=APP_NAME, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Pydantic models ----------

class Group(BaseModel):
    name: str
    country: Optional[str] = None
    aliases: List[str] = Field(default_factory=list)
    refs: List[str] = Field(default_factory=list)


class Campaign(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    first_seen: Optional[str] = None  # ISO date string
    last_seen: Optional[str] = None   # ISO date string
    sources: List[str] = Field(default_factory=list)  # external reference URLs
    group: Optional[str] = None  # mapped intrusion-set name
    mitre_url: Optional[str] = None  # ATT&CK URL if available


class TimelineEvent(BaseModel):
    group_name: str
    country: Optional[str]
    campaign: str
    date: Optional[str]
    date_range: Optional[Dict[str, Optional[str]]] = None  # {first_seen, last_seen}
    summary: Optional[str]
    source_url: Optional[str]
    mitre_url: Optional[str]


# ---------- In-memory cache ----------

class Cache(BaseModel):
    fetched_at: Optional[str] = None
    groups: List[Group] = Field(default_factory=list)
    campaigns: List[Campaign] = Field(default_factory=list)

    def is_warm(self) -> bool:
        return self.fetched_at is not None

    def touch(self) -> None:
        self.fetched_at = datetime.now(timezone.utc).isoformat()


CACHE = Cache()


# ---------- Helpers ----------

def _iso(date_str: Optional[str]) -> Optional[str]:
    if not date_str:
        return None
    # STIX may provide full timestamps; cut to date
    try:
        # Try full ISO first
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.date().isoformat()
    except Exception:
        # Try only date
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date().isoformat()
        except Exception:
            return None


def _pick_best_date(first_seen: Optional[str], last_seen: Optional[str]) -> Optional[str]:
    # Prefer first_seen; else last_seen
    return _iso(first_seen) or _iso(last_seen)


async def _fetch_json(client: httpx.AsyncClient, url: str) -> Any:
    r = await client.get(url, timeout=HTTP_TIMEOUT)
    r.raise_for_status()
    return r.json()


def _normalize_attack_url(external_references: List[dict]) -> Optional[str]:
    for ref in external_references or []:
        url = ref.get("url")
        if url and "attack.mitre.org" in url:
            return url
    return None


# ---------- Data loaders ----------

async def load_misp_groups(client: httpx.AsyncClient) -> List[Group]:
    data = await _fetch_json(client, MISP_GALAXY_TA_URL)
    values = data.get("values", [])
    groups: List[Group] = []
    for v in values:
        name = v.get("value")
        meta = v.get("meta", {})
        if not name:
            continue
        groups.append(
            Group(
                name=name,
                country=meta.get("country"),
                aliases=meta.get("synonyms", []) or [],
                refs=meta.get("refs", []) or [],
            )
        )
    return groups


async def load_mitre_campaigns_with_groups(client: httpx.AsyncClient) -> List[Campaign]:
    bundle = await _fetch_json(client, MITRE_ENTERPRISE_URL)
    objects = bundle.get("objects", [])

    # Build indices for campaigns, intrusion-sets, relationships
    campaigns: Dict[str, dict] = {}
    intrusion_sets: Dict[str, dict] = {}
    relationships: List[dict] = []

    for obj in objects:
        t = obj.get("type")
        if t == "campaign":
            campaigns[obj["id"]] = obj
        elif t == "intrusion-set":
            intrusion_sets[obj["id"]] = obj
        elif t == "relationship":
            relationships.append(obj)

    # Map campaign → intrusion-set via relationship type 'attributed-to'
    campaign_to_intrusions: Dict[str, List[str]] = {}
    for rel in relationships:
        if rel.get("relationship_type") == "attributed-to":
            src = rel.get("source_ref")
            tgt = rel.get("target_ref")
            if src and src.startswith("campaign--") and tgt and tgt.startswith("intrusion-set--"):
                campaign_to_intrusions.setdefault(src, []).append(tgt)

    results: List[Campaign] = []
    for cid, cobj in campaigns.items():
        ir_names: List[str] = []
        for intru_id in campaign_to_intrusions.get(cid, []):
            in_obj = intrusion_sets.get(intru_id)
            if in_obj and in_obj.get("name"):
                ir_names.append(in_obj["name"])  # e.g., APT28, Cozy Bear, etc.

        ext_refs = cobj.get("external_references", [])
        mitre_url = _normalize_attack_url(ext_refs)
        source_urls = [r.get("url") for r in ext_refs if r.get("url")]

        results.append(
            Campaign(
                id=cid,
                name=cobj.get("name", "Unknown Campaign"),
                description=cobj.get("description"),
                first_seen=cobj.get("first_seen"),
                last_seen=cobj.get("last_seen"),
                sources=source_urls,
                group=ir_names[0] if ir_names else None,  # take the first if multiple
                mitre_url=mitre_url,
            )
        )

    return results


# ---------- Enrichment & normalization ----------

def build_alias_map(groups: List[Group]) -> Dict[str, Group]:
    """Map lowercase name/aliases → Group object for quick lookup."""
    idx: Dict[str, Group] = {}
    for g in groups:
        idx[g.name.lower()] = g
        for a in g.aliases:
            idx[a.lower()] = g
    return idx


def to_timeline_events(campaigns: List[Campaign], groups: List[Group]) -> List[TimelineEvent]:
    alias_map = build_alias_map(groups)
    events: List[TimelineEvent] = []

    for c in campaigns:
        gname = c.group or "Unknown"
        gmatch = alias_map.get(gname.lower())
        country = gmatch.country if gmatch else None
        date_main = _pick_best_date(c.first_seen, c.last_seen)

        events.append(
            TimelineEvent(
                group_name=gmatch.name if gmatch else gname,
                country=country or "Unknown",
                campaign=c.name,
                date=date_main,
                date_range={"first_seen": _iso(c.first_seen), "last_seen": _iso(c.last_seen)},
                summary=c.description,
                source_url=(c.sources[0] if c.sources else None),
                mitre_url=c.mitre_url,
            )
        )

    return events


# ---------- Refresh routine ----------

async def refresh_cache() -> None:
    async with httpx.AsyncClient(follow_redirects=True) as client:
        groups = await load_misp_groups(client)
        campaigns = await load_mitre_campaigns_with_groups(client)

    CACHE.groups = groups
    CACHE.campaigns = campaigns
    CACHE.touch()


async def periodic_refresher() -> None:
    while True:
        try:
            await refresh_cache()
        except Exception as e:
            # In production, use proper logging
            print(f"[WARN] refresh failed: {e}")
        await asyncio.sleep(REFRESH_INTERVAL_SECONDS)


@app.on_event("startup")
async def on_startup() -> None:
    # Warm cache once and spawn refresher
    await refresh_cache()
    asyncio.create_task(periodic_refresher())


# ---------- API ----------

@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "name": APP_NAME,
        "status": "ok",
        "fetched_at": CACHE.fetched_at,
        "groups": len(CACHE.groups),
        "campaigns": len(CACHE.campaigns),
    }


@app.get("/groups", response_model=List[Group])
async def get_groups() -> List[Group]:
    return CACHE.groups


@app.get("/campaigns", response_model=List[Campaign])
async def get_campaigns() -> List[Campaign]:
    return CACHE.campaigns


@app.get("/timeline", response_model=List[TimelineEvent])
async def get_timeline(
    group: Optional[str] = Query(None, description="Filter by group (name or alias)"),
    country: Optional[str] = Query(None, description="Filter by origin country"),
    from_date: Optional[str] = Query(None, description="YYYY-MM-DD inclusive lower bound"),
    to_date: Optional[str] = Query(None, description="YYYY-MM-DD inclusive upper bound"),
    limit: int = Query(500, ge=1, le=5000),
    sort: str = Query("date_desc", regex="^(date_asc|date_desc)$"),
) -> List[TimelineEvent]:
    events = to_timeline_events(CACHE.campaigns, CACHE.groups)

    def date_in_range(d: Optional[str]) -> bool:
        if not d:
            return True
        try:
            dt = datetime.strptime(d, "%Y-%m-%d").date()
        except Exception:
            return True
        if from_date:
            try:
                if dt < datetime.strptime(from_date, "%Y-%m-%d").date():
                    return False
            except Exception:
                pass
        if to_date:
            try:
                if dt > datetime.strptime(to_date, "%Y-%m-%d").date():
                    return False
            except Exception:
                pass
        return True

    # Filtering
    if group:
        gq = group.lower()
        events = [e for e in events if e.group_name.lower() == gq]
        # Note: exact match after alias resolution; you can change to `in` contains if preferred

    if country:
        cq = country.lower()
        events = [e for e in events if (e.country or "").lower() == cq]

    events = [e for e in events if date_in_range(e.date)]

    # Sorting
    def sort_key(ev: TimelineEvent):
        # None dates go last in desc, first in asc
        if ev.date is None:
            # Use epoch sentinel
            return datetime(1900, 1, 1).date()
        try:
            return datetime.strptime(ev.date, "%Y-%m-%d").date()
        except Exception:
            return datetime(1900, 1, 1).date()

    events.sort(key=sort_key, reverse=(sort == "date_desc"))

    return events[:limit]


@app.post("/refresh")
async def force_refresh() -> Dict[str, Any]:
    try:
        await refresh_cache()
        return {"status": "refreshed", "fetched_at": CACHE.fetched_at}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------- Local dev entrypoint ----------
# Run with: uvicorn app:app --reload --port 8000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
