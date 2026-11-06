import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PartialType } from '@nestjs/mapped-types';
import { AuditAction, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

export class CreateUserDto {
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() name: string;
  @IsEnum(Role) role: Role;
  @IsOptional() @IsString() companyId?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
  /** bcrypt only reads the first 72 bytes, so longer passwords would be silently truncated. */
  @IsString() @MinLength(8) @MaxLength(64) password: string;
}
export class UpdateUserDto extends PartialType(CreateUserDto) {}

/** Never select the password hash into anything that is returned or audited. */
const SAFE = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  companyId: true,
  company: { select: { id: true, code: true, name: true } },
} satisfies Prisma.UserSelect;

const auditView = (u: { email: string; name: string; role: Role; active: boolean; companyId: string | null }) => ({
  email: u.email,
  name: u.name,
  role: u.role,
  active: u.active,
  companyId: u.companyId,
});

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(page: number, pageSize: number, q?: string) {
    const where: Prisma.UserWhereInput = q
      ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, select: SAFE, orderBy: { email: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total };
  }

  async get(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE });
    if (!user) throw new NotFoundException();
    return user;
  }

  private assertCompanyRule(role: Role, companyId: string | null | undefined) {
    if (role === Role.INVESTEE && !companyId) throw new BadRequestException('An investee user must belong to a company');
  }

  async create(dto: CreateUserDto, actor: AuthUser) {
    this.assertCompanyRule(dto.role, dto.companyId);
    try {
      const created = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          name: dto.name,
          role: dto.role,
          companyId: dto.companyId ?? null,
          active: dto.active ?? true,
          passwordHash: await bcrypt.hash(dto.password, 10),
        },
        select: SAFE,
      });
      await this.audit.record({ object: 'User Overview', objectId: created.id, action: AuditAction.CREATE, user: actor, after: auditView(created) });
      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') throw new ConflictException('A user with this email already exists');
        if (e.code === 'P2003') throw new BadRequestException('Company does not exist');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser) {
    const before = await this.get(id);
    const role = dto.role ?? before.role;
    const companyId = dto.companyId === undefined ? before.companyId : dto.companyId;
    this.assertCompanyRule(role, companyId);
    if (id === actor.id && (dto.active === false || (dto.role && dto.role !== Role.ADMIN))) {
      throw new BadRequestException('You cannot deactivate or demote your own account');
    }
    try {
      const { password, email, ...rest } = dto;
      const updated = await this.prisma.user.update({
        where: { id },
        data: {
          ...rest,
          ...(email && { email: email.toLowerCase() }),
          ...(password && { passwordHash: await bcrypt.hash(password, 10) }),
        },
        select: SAFE,
      });
      await this.audit.record({
        object: 'User Overview',
        objectId: id,
        action: AuditAction.UPDATE,
        user: actor,
        before: { ...auditView(before), ...(password && { passwordChanged: false }) },
        after: { ...auditView(updated), ...(password && { passwordChanged: true }) },
      });
      return updated;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') throw new ConflictException('A user with this email already exists');
        if (e.code === 'P2003') throw new BadRequestException('Company does not exist');
      }
      throw e;
    }
  }
}
