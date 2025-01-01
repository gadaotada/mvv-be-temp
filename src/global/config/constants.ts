import dotenv from "dotenv";
import { join } from "path";

const currWD = join(process.cwd(), "/.env")
dotenv.config({path: currWD});

export const DB_HOST = process.env.DB_HOST;
export const DB_USER = process.env.DB_USER;
export const DB_PASS = process.env.DB_PASS;
export const DB_NAME = process.env.DB_NAME;
export const AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET!;

export const APP_DEFAUTLT_ROLES: Auth.Role[] = [
    {
        id: 1,
        name: "admin",
        permissions: ["*"],
        inherits: [],
        description: "Administrator"
    },
    {
        id: 2,
        name: "moderator",
        permissions: [
            "post:read:any",
            "post:create:any",
            "post:update:any",
            "post:delete:any",
            "users:read:any",
            "users:update:any",
            "comments:read:any",
            "comments:update:any",
            "comments:delete:any"
        ],
        inherits: ["user"],
        description: "Moderator for all posts and users"
    },
    {
        id: 3,
        name: "user",
        permissions: [
            "post:read:own",
            "post:create:own",
            "post:update:own",
            "post:delete:own",
            "comments:create:own",
            "comments:read:own",
            "comments:update:own",
            "comments:delete:own",
            "users:read:own",
            "users:update:own"
        ],
        inherits: [],
        description: "User with own posts"
    }
]