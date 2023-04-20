import { ChannelUserRoles } from "../entities/channelUser.entity";

export interface User {
  userId: string;
  userName: string;
  socketId: string;
}

export interface Room {
  name: string;
  host: User;
  users: User[];
}

export interface Message {
  user: User;
  timeSent: Date;
  message: string;
  roomName: string;
}

export interface ChatUser {
  userId: string;
  userName: string;
  profile_url: string;
  role: ChannelUserRoles;
  deleted_at: null;
}