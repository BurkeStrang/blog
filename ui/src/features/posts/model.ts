import type { Vector3 } from "three";

export interface Post {
  id?: number;
  slug: string;
  previous?: string;
  next?: string;
  title: string;
  body: string;
  position?: Vector3;
  date?: Date;
  pageViews?: number;
  recentViews?: number;
  lastViewed?: Date;
  commentCount?: number;
}
