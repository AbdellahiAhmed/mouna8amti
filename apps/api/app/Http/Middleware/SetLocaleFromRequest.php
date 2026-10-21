<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Validation and error messages follow the interface language the SPA sends. */
final class SetLocaleFromRequest
{
    private const SUPPORTED = ['ar', 'fr', 'en'];

    public function handle(Request $request, Closure $next): Response
    {
        app()->setLocale($request->getPreferredLanguage(self::SUPPORTED) ?? config('app.locale'));

        return $next($request);
    }
}
