export interface XPostMetrics {
  replies: number;
  reposts: number;
  likes: number;
  views: string;
}

export interface XQuotePost {
  author: string;
  handle: string;
  time: string;
  text: string;
  avatar?: string;
  media?: string;
}

export interface XPost {
  id: string;
  author: string;
  handle: string;
  time: string;
  text: string;
  avatar: string;
  verified?: boolean;
  media?: string;
  mediaAlt?: string;
  quote?: XQuotePost;
  context?: string;
  replyTo?: string;
  initiallyLiked?: boolean;
  initiallyReposted?: boolean;
  initiallyBookmarked?: boolean;
  metrics: XPostMetrics;
}
