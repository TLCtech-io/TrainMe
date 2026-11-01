#!/usr/bin/env python3
"""Replace frame ranges of a rendered loop with re-rendered patches (so a change that only touches a few seconds does
not need the whole loop rendered again). Output is lossless, like the inputs.

  python3 tools/patch_frames.py <master.mp4> <out.mp4> <patch.mp4>@<first frame> [...]

Each patch covers the frames from <first frame> for as many frames as it holds; patches must not overlap.
"""
import subprocess, sys

def frames(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
                          "stream=nb_read_frames", "-of", "csv=p=0", path], capture_output=True, text=True, check=True)
    return int(out.stdout.strip())

master, out, specs = sys.argv[1], sys.argv[2], sys.argv[3:]
total = frames(master)
patches = sorted(((int(a), p, frames(p)) for p, a in (s.rsplit("@", 1) for s in specs)))
inputs, parts, pos = ["-i", master], [], 0
for k, (first, path, n) in enumerate(patches, 1):
    assert first >= pos, "patches overlap"
    if first > pos: parts.append(f"[0:v]trim=start_frame={pos}:end_frame={first},setpts=PTS-STARTPTS[m{k}]");
    inputs += ["-i", path]
    parts.append(f"[{k}:v]setpts=PTS-STARTPTS[p{k}]")
    pos = first + n
if pos < total: parts.append(f"[0:v]trim=start_frame={pos}:end_frame={total},setpts=PTS-STARTPTS[mend]")
labels = [s[s.rindex("["):] for s in parts]
graph = ";".join(parts) + ";" + "".join(labels) + f"concat=n={len(labels)}:v=1:a=0[v]"
subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", graph, "-map", "[v]", "-c:v", "libx264",
                "-preset", "veryfast", "-qp", "0", "-pix_fmt", "yuv444p", "-r", "30", out], check=True)
print(f"{out}: {frames(out)} frames (master {total})")
