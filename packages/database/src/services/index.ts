// biome-ignore lint/performance/noBarrelFile: service layer entry point
export {
  getFavoritePhotoIds,
  getFavoritesPaginated,
  toggleFavorite,
} from "./favorite.service";
export type { LeaderboardEntry } from "./game-score.service";
export {
  getGameStats,
  getLeaderboard,
  getUserBestScore,
  getUserGameStats,
  submitGameScore,
} from "./game-score.service";
export type { PhotoWithUser } from "./photo.service";
export {
  createPhoto,
  deletePhoto,
  getPhotoCount,
  getPhotosPaginated,
  getRandomPhotos,
  getUserPhotoCount,
} from "./photo.service";
export {
  createPrompt,
  deletePrompt,
  getPositivePromptsByCategory,
  getPromptsByTopicId,
  ratePrompt,
  updatePromptNote,
} from "./prompt.service";
export {
  deleteProvider,
  getActiveProvider,
  getProviders,
  getProviderWithDecryptedKey,
  setActiveProvider,
  upsertProvider,
} from "./provider.service";
export { getSettings } from "./settings.service";
export {
  deleteSocialAccount,
  getConnectedAccounts,
  getSocialAccount,
  upsertSocialAccount,
} from "./social-account.service";
export {
  getDailySummary,
  getTopicStats,
} from "./stats.service";
export {
  deleteAllTopics,
  deleteSelectedTopics,
  deleteTopic,
  getDiscoveredTopics,
  getDiscoveredTopicsPaginated,
  getSelectedTopicsPaginated,
  getTopicsByStatus,
  getTopicWithPrompts,
  ingestTopics,
  selectTopic,
  selectTopics,
} from "./topic.service";
export {
  checkUserAppAccess,
  deleteUser,
  getUserById,
  getUsers,
  updateUserAllowedApps,
} from "./user.service";
export { logWebhook } from "./webhook-log.service";
