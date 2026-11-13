<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class TaskCollection extends ResourceCollection
{
    protected ?array $additionalMeta;

    public function __construct($resource, ?array $additionalMeta = null)
    {
        parent::__construct($resource);
        $this->additionalMeta = $additionalMeta;
    }

    public function toArray(Request $request): array
    {
        $meta = [
            'pagination' => [
                'current_page' => $this->resource->currentPage(),
                'per_page' => $this->resource->perPage(),
                'total' => $this->resource->total(),
                'last_page' => $this->resource->lastPage(),
            ],
        ];

        if ($this->additionalMeta) {
            $meta = array_merge($meta, $this->additionalMeta);
        }

        return [
            'data' => $this->collection,
            'meta' => $meta,
        ];
    }
}
