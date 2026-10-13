// Exercise demo photos from free-exercise-db (public domain), served via jsDelivr pinned to a commit
// so images never change underneath us. Each exercise has a start (0) and end (1) position photo.
const BASE = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/exercises";

export function mediaUrl(id: string, frame: 0 | 1 = 0) {
  return `${BASE}/${encodeURIComponent(id)}/${frame}.jpg`;
}

export type ExerciseGuide = { steps: string[]; tips: string[] };
