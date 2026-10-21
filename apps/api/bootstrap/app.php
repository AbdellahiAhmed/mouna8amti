<?php

use App\Http\Middleware\SetLocaleFromRequest;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->api(prepend: [SetLocaleFromRequest::class]);
        // An authenticated user hitting a guest route gets JSON, not a redirect to "/home".
        $middleware->redirectUsersTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // One error contract for the whole API: { message, code, errors? }.
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());

        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            [$status, $code] = match (true) {
                $e instanceof ValidationException => [$e->status, $e->status === 429 ? 'too_many_attempts' : 'validation_failed'],
                $e instanceof AuthenticationException => [401, 'unauthenticated'],
                $e instanceof AuthorizationException, $e instanceof AccessDeniedHttpException => [403, 'forbidden'],
                $e instanceof ModelNotFoundException, $e instanceof NotFoundHttpException => [404, 'not_found'],
                $e instanceof ConflictHttpException => [409, 'invalid_state'],
                $e instanceof TooManyRequestsHttpException => [429, 'too_many_requests'],
                $e instanceof HttpExceptionInterface => [$e->getStatusCode(), 'http_error'],
                default => [null, null],
            };

            if ($status === null) {
                return null; // Unexpected errors keep Laravel's handling (generic message in production).
            }

            $body = [
                'message' => match ($code) {
                    'not_found' => __('Not found.'),
                    'forbidden' => __('This action is unauthorized.'),
                    'unauthenticated' => __('Unauthenticated.'),
                    default => $e->getMessage(),
                },
                'code' => $code,
            ];

            if ($e instanceof ValidationException) {
                $body['errors'] = $e->errors();
            }

            return response()->json($body, $status);
        });
    })->create();
