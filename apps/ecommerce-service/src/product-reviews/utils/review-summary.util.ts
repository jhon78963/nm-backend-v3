export type ProductReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ReviewSummary {
  averageRating: number;
  reviewsCount: number;
  ratingDistribution: number[];
}

export function buildReviewSummary(
  reviews: Array<{ rating: number }>,
): ReviewSummary {
  const ratingDistribution = [0, 0, 0, 0, 0];

  for (const review of reviews) {
    const index = Math.min(5, Math.max(1, review.rating)) - 1;
    ratingDistribution[index] += 1;
  }

  const reviewsCount = reviews.length;
  const averageRating = reviewsCount > 0
    ? Math.round(
      (reviews.reduce((sum, review) => sum + review.rating, 0) / reviewsCount) * 100,
    ) / 100
    : 0;

  return {
    averageRating,
    reviewsCount,
    ratingDistribution,
  };
}

export function mapPublicReview(review: {
  id: string;
  rating: number;
  description: string;
  createdAt: Date;
  customer: { name: string };
}) {
  return {
    id: review.id,
    authorName: review.customer.name,
    rating: review.rating,
    description: review.description,
    createdAt: review.createdAt,
  };
}
