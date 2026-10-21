<?php

namespace Tests;

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /** Refuses to boot against anything but a dedicated test database: RefreshDatabase drops every table. */
    public function createApplication(): Application
    {
        $app = parent::createApplication();
        $database = (string) $app['config']->get('database.connections.'.$app['config']->get('database.default').'.database');

        if (! str_ends_with($database, '_testing')) {
            throw new RuntimeException("Refusing to run tests against non-test database [{$database}].");
        }

        return $app;
    }
}
