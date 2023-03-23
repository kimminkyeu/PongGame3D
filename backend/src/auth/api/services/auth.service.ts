import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../../models/user/entities';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { SessionService } from '../../../common/session/session.service';
import { SessionStatusEnum } from '../../../common/enums/sessionStatus.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private sessionService: SessionService
  ) {}

  async redirect(data, req: Request) {
    const user = await this.userRepository.findOne({
      where: {
        email: data.email,
      },
    });
    if (!user) {
      return await this.signUp(data, req);
    } else {
      return await this.signIn(user, req);
    }
  }

  async signIn(user: User, req: Request) {
    // 2FA 상황인지 체크
    if (user.two_factor) {
      req.session.sessionStatus = SessionStatusEnum.TWO_FACTOR;
      return {
        status: '2FA',
        user_id: user.user_id,
      };
    }
    await this.sessionService.checkSession(user, req);
    this.sessionService.createSession(user, req);
    return {
      status: 'SUCCESS',
      user_id: user.user_id,
    };
  }

  /**
   * api 가 접근이 될 때, 유저를 바로 생성하지 않고 생성 권한을 부여하는 역할을 수행함.
   */
  async signUp(data, req: Request) {
    req.session.user_id = null;
    req.session.userStatus = null; // fixme : alarm socket 연결 시에?
    req.session.email = data.email;
    req.session.sessionStatus = SessionStatusEnum.SIGNUP;
    return {
      status: 'SIGNUP_MODE',
    };
  }
}
