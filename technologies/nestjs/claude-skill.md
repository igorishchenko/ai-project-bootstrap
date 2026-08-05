# NestJS

The API in {{projectName}}.

## Validation is opt-in, and silent when missing

Nest does not validate request bodies by default. A DTO without the global
`ValidationPipe` is a comment.

```ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

`whitelist` is the one people omit. Without it, properties not on the DTO pass
straight through to your service — so a request to update a display name can
also carry `role: "admin"`, and nothing rejects it.

## DTOs must be classes

```ts
export class CreateUserDto {
  @IsEmail() email!: string;
}
```

An `interface` is erased at compile time. It cannot validate anything at
runtime, and using one is a silent no-op rather than an error.

## Auth defaults to closed

Apply the guard globally and opt routes out explicitly with `@Public()`. The
alternative — remembering `@UseGuards` on every new endpoint — fails exactly
once, and that once is a breach.

Never read a user id from the request body. Derive it from the verified token.

## Controllers stay thin

Parse, delegate, return. Logic in a provider can be tested by calling a function;
logic in a controller needs an HTTP layer to exercise it, so it tends not to get
tested at all.

## Map entities to response DTOs

Returning an ORM entity serialises every column on it — including the ones added
later by someone who did not know the entity was returned directly. Map
explicitly.

## Verifying

{{#if has.jest}}`npm test` runs the unit tests; `npm run test:e2e` exercises the HTTP layer.
{{/if}}{{#unless has.jest}}`npm run test:e2e` is defined, but no test runner is installed — see
`docs/testing.md` before relying on it.
{{/unless}}Report what actually ran, and if the `ValidationPipe` or guards are not
registered globally, say so — those are the two configuration gaps that make
everything else here decorative.
