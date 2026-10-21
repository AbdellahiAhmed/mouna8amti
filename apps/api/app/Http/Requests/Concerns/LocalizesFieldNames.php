<?php

namespace App\Http\Requests\Concerns;

/** Validation messages name fields in the request's language ("تاريخ البداية", not "starts on"). */
trait LocalizesFieldNames
{
    /** @return array<string, string> */
    public function attributes(): array
    {
        $fields = trans('fields');

        return is_array($fields) ? $fields : [];
    }
}
