import { apiService } from "../../shared/services/api";
import type { Post } from "./model";

export interface PostInput {
  title: string;
  body: string;
  slug: string;
  previous?: string;
  next?: string;
  date?: Date;
}

export const fetchPosts = (): Promise<Post[]> => apiService.getPosts();

export const fetchPostsUncached = (): Promise<Post[]> => apiService.getPostsUncached();

export const fetchPost = (slug: string): Promise<Post> => apiService.getPost(slug);

export const trackPostView = (slug: string): Promise<void> => apiService.trackPostView(slug);

export const createPost = (input: PostInput): Promise<Post> => apiService.createPost(input);

export const updatePost = (id: string, input: PostInput): Promise<Post> =>
  apiService.updatePost(id, input);

export const deletePost = (id: string): Promise<{ message: string; id: number }> =>
  apiService.deletePost(id);
