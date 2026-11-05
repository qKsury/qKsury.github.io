#!/usr/bin/env python3
"""Build data/top-tracks.json from Last.fm without exposing the API key in frontend code."""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "top-tracks.json"
LASTFM_ENDPOINT = "https://ws.audioscrobbler.com/2.0/"
ITUNES_ENDPOINT = "https://itunes.apple.com/search"


def get_json(url: str, params: dict[str, Any]) -> dict[str, Any]:
    request = Request(
        f"{url}?{urlencode(params)}",
        headers={"User-Agent": "KsuryMusicCollection/1.0 (GitHub Pages)"},
    )
    with urlopen(request, timeout=25) as response:
        return json.load(response)


def largest_lastfm_image(images: Any) -> str | None:
    if not isinstance(images, list):
        return None
    for image in reversed(images):
        if isinstance(image, dict) and image.get("#text"):
            return image["#text"]
    return None


def enrich_with_itunes(artist: str, track: str) -> dict[str, str | None]:
    """Add cover art and a freely provided 30-second Apple Music preview when available."""
    try:
        payload = get_json(
            ITUNES_ENDPOINT,
            {"term": f"{artist} {track}", "entity": "song", "limit": 5},
        )
        results = payload.get("results", [])
        normalized_artist = artist.casefold()
        normalized_track = track.casefold()
        match = next(
            (
                item
                for item in results
                if item.get("artistName", "").casefold() == normalized_artist
                and item.get("trackName", "").casefold() == normalized_track
            ),
            results[0] if results else {},
        )
        artwork = match.get("artworkUrl100")
        if artwork:
            artwork = artwork.replace("100x100bb.jpg", "600x600bb.jpg")
        return {"image": artwork, "previewUrl": match.get("previewUrl")}
    except Exception as error:  # Artwork enrichment must not discard valid Last.fm data.
        print(f"::warning::iTunes enrichment skipped for {artist} — {track}: {error}")
        return {"image": None, "previewUrl": None}


def update() -> None:
    api_key = os.environ.get("LASTFM_API_KEY", "").strip()
    username = os.environ.get("LASTFM_USERNAME", "").strip()
    if not api_key or not username:
        print("LASTFM_API_KEY or LASTFM_USERNAME is not configured; keeping the bundled demo data.")
        return

    payload = get_json(
        LASTFM_ENDPOINT,
        {
            "method": "user.gettoptracks",
            "user": username,
            "api_key": api_key,
            "format": "json",
            "period": "1month",
            "limit": 10,
        },
    )
    if "error" in payload:
        raise RuntimeError(f"Last.fm API error {payload['error']}: {payload.get('message', 'unknown error')}")

    raw_tracks = payload.get("toptracks", {}).get("track", [])
    tracks = []
    for item in raw_tracks[:10]:
        artist_data = item.get("artist", {})
        artist = artist_data.get("name", "") if isinstance(artist_data, dict) else str(artist_data)
        name = item.get("name", "")
        enrichment = enrich_with_itunes(artist, name)
        tracks.append(
            {
                "artist": artist,
                "name": name,
                "playcount": int(item.get("playcount", 0)),
                "image": enrichment["image"] or largest_lastfm_image(item.get("image")),
                "url": item.get("url"),
                "previewUrl": enrichment["previewUrl"],
            }
        )
        time.sleep(0.2)

    result = {
        "demo": False,
        "period": "1month",
        "periodLabel": "Последние 30 дней",
        "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "username": username,
        "tracks": tracks,
    }
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {OUTPUT.relative_to(ROOT)} with {len(tracks)} tracks for @{username}.")


if __name__ == "__main__":
    try:
        update()
    except Exception as error:
        # Keep the previous JSON and let Pages deploy instead of taking the whole site down.
        print(f"::warning::Last.fm refresh failed; keeping previous data: {error}")
        sys.exit(0)
