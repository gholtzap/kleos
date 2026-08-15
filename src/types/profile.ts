export interface AccountIdentity {
  id: string;
  name: string;
  handle: string;
}

export interface Post {
  id: string;
  author: AccountIdentity;
  text: string;
  postedAt: string;
  replyCount: number;
  repostCount: number;
  likeCount: number;
}
