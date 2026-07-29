// biome-ignore lint/performance/noBarrelFile: service layer entry point
export {
  getFavoritePhotoIds,
  getFavoritesPaginated,
  toggleFavorite,
} from "./favorite.service";
export type { LeaderboardEntry } from "./game-score.service";
export {
  getGameStats,
  getGlobalBestScore,
  getLeaderboard,
  getUserBestScore,
  getUserGameStats,
  submitGameScore,
} from "./game-score.service";
export type { PhotoWithUser } from "./photo.service";
export {
  createPhoto,
  deletePhoto,
  getAllRandomPhotos,
  getPhotoCount,
  getPhotosPaginated,
  getRandomPhotos,
  getUserPhotoCount,
} from "./photo.service";
export type { QuizQuestionWithAnswers } from "./quiz.service";
export {
  createQuizQuestion,
  deleteQuizQuestion,
  getAllQuizQuestions,
  getQuizQuestionById,
  getQuizQuestionCount,
  getRandomQuizQuestions,
  updateQuizQuestion,
} from "./quiz.service";
export {
  checkUserAppAccess,
  deleteUser,
  getUserById,
  getUsers,
  updateUserAllowedApps,
} from "./user.service";
