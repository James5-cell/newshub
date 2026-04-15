import process from "node:process"

/**
 * Admin 身份檢查 API
 * 前端用此 API 判斷當前登入使用者是否為 Admin，以控制「管理來源」按鈕的顯示
 *
 * GET /api/admin/check → { isAdmin: boolean }
 */
export default defineEventHandler(async (event) => {
  const adminId = process.env.ADMIN_GITHUB_ID
  if (!adminId || !event.context.user?.id) {
    return { isAdmin: false }
  }
  return {
    isAdmin: String(event.context.user.id) === String(adminId),
  }
})
