export interface Comment {
  id: number | string;
  post_id: number;
  content: string;
  author: string;
  created_at: string;
  parent_id?: number;
  like_count: number;
  cosmos_id?: string; // Full Cosmos DB ID (e.g., "comment-1759015437640")
  replies?: Comment[];
}

export interface CreateCommentRequest {
  post_id: number;
  content: string;
  parent_id?: number | string;
}

export interface CommentLikeResponse {
  like_count: number;
  user_liked: boolean;
}
