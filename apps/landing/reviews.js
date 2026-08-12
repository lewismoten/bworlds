const reviewsContainer = document.querySelector("#reviews-list");

const randomItem = items =>
  items[Math.floor(Math.random() * items.length)];

const shuffle2 = items => {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
};

const renderReviews = (reviews, reviewers) => {
  const selectedReviews = shuffle2(reviews).slice(0, 5);
  const selectedReviewers = shuffle2(reviewers).slice(0, 5);

  reviewsContainer.replaceChildren();

  selectedReviews.forEach((review, index) => {
    const article = document.createElement("article");
    article.className = "review-card";

    const quote = document.createElement("blockquote");
    quote.textContent = `“${review}”`;

    const author = document.createElement("cite");
    author.textContent = `— ${selectedReviewers[index]}`;

    article.append(quote, author);
    reviewsContainer.append(article);
  });
};

const loadReviews = async () => {
  try {
    const [reviewsResponse, reviewersResponse] = await Promise.all([
      fetch("reviews.json?1"),
      fetch("reviewers.json"),
    ]);

    if (!reviewsResponse.ok) {
      throw new Error(
        `Unable to load reviews.json: ${reviewsResponse.status}`,
      );
    }

    if (!reviewersResponse.ok) {
      throw new Error(
        `Unable to load reviewers.json: ${reviewersResponse.status}`,
      );
    }

    const [reviews, reviewers] = await Promise.all([
      reviewsResponse.json(),
      reviewersResponse.json(),
    ]);

    if (!Array.isArray(reviews) || reviews.length === 0) {
      throw new Error("reviews.json must contain a non-empty array.");
    }

    if (!Array.isArray(reviewers) || reviewers.length === 0) {
      throw new Error("reviewers.json must contain a non-empty array.");
    }

    renderReviews(reviews, reviewers);
  } catch (error) {
    console.error(error);

    reviewsContainer.textContent =
      "Imaginary complaints are temporarily unavailable.";
  }
};

loadReviews();