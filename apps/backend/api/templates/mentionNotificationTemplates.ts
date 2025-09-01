import { NotificationType } from '@prisma/client';

export interface MentionNotificationData {
  taskId: string;
  taskTitle: string;
  commentId: string;
  commentPreview: string;
  mentionerName: string;
  mentionerUsername: string;
  mentionerAvatarUrl: string | null;
}

export class MentionNotificationTemplates {
  /**
   * Generate mention notification message
   */
  static createMentionMessage(data: MentionNotificationData): string {
    const { mentionerName, taskTitle } = data;
    return `${mentionerName} mentioned you in a comment on "${taskTitle}"`;
  }

  /**
   * Generate push notification title
   */
  static createPushTitle(): string {
    return "What's Next Please";
  }

  /**
   * Generate push notification body
   */
  static createPushBody(data: MentionNotificationData): string {
    const { mentionerName, taskTitle } = data;
    return `${mentionerName} mentioned you in "${taskTitle}"`;
  }

  /**
   * Create comment preview (strip HTML and truncate)
   */
  static createCommentPreview(htmlContent: string, maxLength: number = 100): string {
    try {
      // Remove HTML tags using regex (simple approach)
      const plainText = htmlContent
        .replace(/<[^>]*>/g, ' ') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      if (plainText.length <= maxLength) {
        return plainText;
      }

      // Truncate and add ellipsis
      return plainText.substring(0, maxLength - 3).trim() + '...';
    } catch (error) {
      console.error('Failed to create comment preview:', error);
      return 'New comment';
    }
  }
  /**
   * Generate complete notification data for mention
   */
  static createMentionNotificationData(
    taskId: string,
    taskTitle: string,
    commentId: string,
    commentContent: string,
    mentionerInfo: {
      name: string;
      username: string;
      avatarUrl: string | null;
    }
  ): {
    type: NotificationType;
    message: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
  } {
    const commentPreview = this.createCommentPreview(commentContent);

    const mentionData: MentionNotificationData = {
      taskId,
      taskTitle,
      commentId,
      commentPreview,
      mentionerName: mentionerInfo.name,
      mentionerUsername: mentionerInfo.username,
      mentionerAvatarUrl: mentionerInfo.avatarUrl,
    };

    return {
      type: NotificationType.COMMENT_MENTION,
      message: this.createMentionMessage(mentionData),
      data: {
        type: NotificationType.COMMENT_MENTION,
        taskId,
        commentId,
        details: {
          taskTitle,
          commentPreview,
          mentionerName: mentionerInfo.name,
          mentionerUsername: mentionerInfo.username,
        },
        name: mentionerInfo.name,
        username: mentionerInfo.username,
        avatarUrl: mentionerInfo.avatarUrl,
        url: `/taskOfferings/${taskId}#comment-${commentId}`, // Direct link to comment
        // Push notification specific data
        pushNotification: {
          title: this.createPushTitle(),
          body: this.createPushBody(mentionData),
        },
      },
    };
  }
}
