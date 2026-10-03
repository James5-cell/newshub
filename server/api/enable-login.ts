import process from "node:process"

export default defineEventHandler(async () => {
  return {
    enable: !!(process.env.JWT_SECRET && process.env.G_CLIENT_ID && process.env.G_CLIENT_SECRET),
    url: "/api/login",
  }
})
