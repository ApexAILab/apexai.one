import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";
import { cookies } from "next/headers";

/**
 * JWT Secret Key（从环境变量获取，如果没有则使用默认值）
 * 生产环境必须设置 AUTH_SECRET
 */
const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "your-secret-key-change-in-production"
);

/**
 * JWT Token 过期时间（7天）
 */
const JWT_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Cookie 名称
 */
const COOKIE_NAME = "apexai-auth-token";

/**
 * 密码加密
 * @param password 明文密码
 * @returns 加密后的密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * 验证密码
 * @param password 明文密码
 * @param hashedPassword 加密后的密码
 * @returns 是否匹配
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * 生成 JWT Token
 * @param userId 用户 ID
 * @param username 用户名
 * @returns JWT Token 字符串
 */
export async function generateToken(userId: string, username: string): Promise<string> {
  const token = await new SignJWT({ userId, username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN)
    .sign(JWT_SECRET);

  return token;
}

/**
 * 验证 JWT Token
 * @param token JWT Token 字符串
 * @returns Token 载荷（包含 userId 和 username）或 null
 */
export async function verifyToken(token: string): Promise<{ userId: string; username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      username: payload.username as string,
    };
  } catch (error) {
    return null;
  }
}

/**
 * 设置认证 Cookie
 * @param token JWT Token
 */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: JWT_EXPIRES_IN,
    path: "/",
  });
}

/**
 * 获取认证 Cookie
 * @returns JWT Token 或 null
 */
export async function getAuthCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token || null;
}

/**
 * 清除认证 Cookie
 */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * 获取当前登录用户
 * @returns 用户信息或 null（未登录）
 */
export async function getCurrentUser(): Promise<{ id: string; username: string; name: string | null } | null> {
  try {
    const token = await getAuthCookie();
    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return null;
    }

    // 从数据库获取最新用户信息
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        name: true,
      },
    });

    return user;
  } catch (error) {
    console.error("[Auth] 获取当前用户失败:", error);
    return null;
  }
}

/**
 * 验证用户凭据（用于登录）
 * @param username 用户名
 * @param password 密码
 * @returns 用户信息或 null（凭据无效）
 */
export async function verifyCredentials(
  username: string,
  password: string
): Promise<{ id: string; username: string; name: string | null } | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        password: true,
      },
    });

    if (!user) {
      return null;
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return null;
    }

    // 返回用户信息（不包含密码）
    return {
      id: user.id,
      username: user.username,
      name: user.name,
    };
  } catch (error) {
    console.error("[Auth] 验证凭据失败:", error);
    return null;
  }
}

