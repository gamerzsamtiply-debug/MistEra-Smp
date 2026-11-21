// Registry of every API endpoint. The URL is POST /api/<name>.
import type { Endpoint } from '../endpoint.js';
import adminDeletePartner from './adminDeletePartner.js';
import adminDeletePost from './adminDeletePost.js';
import adminGetSettings from './adminGetSettings.js';
import adminListAlbum from './adminListAlbum.js';
import adminListPages from './adminListPages.js';
import adminListPosts from './adminListPosts.js';
import adminListSteps from './adminListSteps.js';
import adminListSuggestions from './adminListSuggestions.js';
import adminListUsers from './adminListUsers.js';
import adminLogs from './adminLogs.js';
import adminOverview from './adminOverview.js';
import adminReviewAlbum from './adminReviewAlbum.js';
import adminSavePage from './adminSavePage.js';
import adminSavePartner from './adminSavePartner.js';
import adminSavePost from './adminSavePost.js';
import adminSaveSettings from './adminSaveSettings.js';
import adminSaveStep from './adminSaveStep.js';
import adminSetRole from './adminSetRole.js';
import adminUpdateSuggestion from './adminUpdateSuggestion.js';
import createUploadUrl from './createUploadUrl.js';
import deleteMyAlbum from './deleteMyAlbum.js';
import deleteMySuggestion from './deleteMySuggestion.js';
import getHome from './getHome.js';
import getMe from './getMe.js';
import getPage from './getPage.js';
import getPublicProfile from './getPublicProfile.js';
import getSite from './getSite.js';
import listAlbum from './listAlbum.js';
import listPartners from './listPartners.js';
import listPosts from './listPosts.js';
import listStaff from './listStaff.js';
import logClientError from './logClientError.js';
import myAlbum from './myAlbum.js';
import mySuggestions from './mySuggestions.js';
import submitAlbum from './submitAlbum.js';
import submitSuggestion from './submitSuggestion.js';
import updateMyProfile from './updateMyProfile.js';
import adminDeleteStaff from './adminDeleteStaff.js';
import adminLinkStaff from './adminLinkStaff.js';
import adminListStaff from './adminListStaff.js';
import adminSaveStaff from './adminSaveStaff.js';
import adminStaffClaimCode from './adminStaffClaimCode.js';
import claimStaff from './claimStaff.js';
import register from './register.js';
import submitFeedback from './submitFeedback.js';
import adminListFeedback from './adminListFeedback.js';
import adminDeleteFeedback from './adminDeleteFeedback.js';
import latestPosts from './latestPosts.js';
import health from './health.js';
import toggleAlbumLike from './toggleAlbumLike.js';
import listAlbumComments from './listAlbumComments.js';
import addAlbumComment from './addAlbumComment.js';
import deleteAlbumComment from './deleteAlbumComment.js';
import trackView from './trackView.js';
import trackAlbumView from './trackAlbumView.js';
import recordLogin from './recordLogin.js';
import adminViews from './adminViews.js';

export const endpoints: Record<string, Endpoint> = {
  trackView,
  trackAlbumView,
  recordLogin,
  adminViews,
  toggleAlbumLike,
  listAlbumComments,
  addAlbumComment,
  deleteAlbumComment,
  adminDeleteStaff,
  adminLinkStaff,
  adminListStaff,
  adminSaveStaff,
  adminStaffClaimCode,
  claimStaff,
  register,
  submitFeedback,
  adminListFeedback,
  adminDeleteFeedback,
  latestPosts,
  health,
  adminDeletePartner,
  adminDeletePost,
  adminGetSettings,
  adminListAlbum,
  adminListPages,
  adminListPosts,
  adminListSteps,
  adminListSuggestions,
  adminListUsers,
  adminLogs,
  adminOverview,
  adminReviewAlbum,
  adminSavePage,
  adminSavePartner,
  adminSavePost,
  adminSaveSettings,
  adminSaveStep,
  adminSetRole,
  adminUpdateSuggestion,
  createUploadUrl,
  deleteMyAlbum,
  deleteMySuggestion,
  getHome,
  getMe,
  getPage,
  getPublicProfile,
  getSite,
  listAlbum,
  listPartners,
  listPosts,
  listStaff,
  logClientError,
  myAlbum,
  mySuggestions,
  submitAlbum,
  submitSuggestion,
  updateMyProfile,
};
