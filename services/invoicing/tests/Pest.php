<?php

/*
|--------------------------------------------------------------------------
| Pest bootstrap — invoicing-service
|--------------------------------------------------------------------------
*/

pest()->extend(Tests\TestCase::class)
    ->use(Illuminate\Foundation\Testing\DatabaseTransactions::class)
    ->in('Feature');
