/**
 * Navigate to and highlight a specific comment
 */
export const navigateToComment = (commentId: string) => {
  const commentElement = document.getElementById(`comment-${commentId}`);

  if (commentElement) {
    commentElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    commentElement.classList.add('comment-highlight');

    setTimeout(() => {
      commentElement.classList.remove('comment-highlight');
    }, 3000);
  }
};

/**
 * Handle URL fragments on page load
 */
export const handleCommentFragment = () => {
  const hash = window.location.hash;
  const commentMatch = hash.match(/^#comment-(.+)$/);

  if (commentMatch) {
    const commentId = commentMatch[1];
    if (!commentId) return;
    setTimeout(() => navigateToComment(commentId), 500);
  }
};
