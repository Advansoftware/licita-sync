import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) { }

  // Credenciais hardcoded
  private readonly VALID_USER = {
    username: 'admin',
    password: 'licita@2024',
    name: 'Administrador'
  };

  async validateUser(username: string, password: string) {
    if (username === this.VALID_USER.username && password === this.VALID_USER.password) {
      return { username: this.VALID_USER.username, name: this.VALID_USER.name };
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.name };
    return {
      access_token: this.jwtService.sign(payload),
      user: { username: user.username, name: user.name }
    };
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      return null;
    }
  }
}
