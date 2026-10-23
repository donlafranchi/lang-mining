#!/usr/bin/env python3
"""Fetch a video's audio, transcribe locally with whisper, write out/<id>.json. Media is temporary."""
import json, sys, tempfile
from pathlib import Path
import whisper
import yt_dlp

OUT = Path(__file__).parent / "out"


def main(url, model_name="small"):
    with tempfile.TemporaryDirectory() as tmp:
        opts = {"format": "bestaudio/best", "outtmpl": f"{tmp}/%(id)s.%(ext)s", "quiet": True}
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            audio = ydl.prepare_filename(info)
        res = whisper.load_model(model_name).transcribe(audio, fp16=False)
    OUT.mkdir(exist_ok=True)
    path = (OUT / f"{info['id']}.json").resolve()
    path.write_text(json.dumps({
        "source_url": url, "video_id": info["id"], "language": res["language"],
        "segments": [{"start": s["start"], "end": s["end"], "text": s["text"].strip()} for s in res["segments"]],
    }, ensure_ascii=False, indent=2))
    print(path)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: yt_transcribe.py URL [model]")
    main(*sys.argv[1:3])
