<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class SystemSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'type',
        'description',
    ];

    /**
     * Get typed value of setting by key
     */
    public static function get(string $key, $default = null)
    {
        $settings = static::getAllSettings();

        if (!array_key_exists($key, $settings)) {
            return $default;
        }

        return $settings[$key];
    }

    /**
     * Set a setting value
     */
    public static function set(string $key, $value, ?string $description = null): void
    {
        $type = 'string';
        $stringValue = $value;

        if (is_bool($value)) {
            $type = 'boolean';
            $stringValue = $value ? 'true' : 'false';
        } elseif (is_int($value) || is_float($value)) {
            $type = 'integer';
            $stringValue = (string) $value;
        } elseif (is_array($value)) {
            $type = 'json';
            $stringValue = json_encode($value);
        }

        static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $stringValue,
                'type' => $type,
                'description' => $description ?? static::where('key', $key)->value('description'),
            ]
        );

        Cache::forget('system_settings_dict');
    }

    public static function clearCache(): void
    {
        Cache::forget('system_settings_dict');
    }

    /**
     * Get all settings as a key-value dictionary with type casting
     */
    public static function getAllSettings(): array
    {
        return Cache::remember('system_settings_dict', 300, function () {
            $records = static::all();
            $dict = [];

            foreach ($records as $record) {
                $val = $record->value;
                if ($record->type === 'boolean') {
                    $val = filter_var($val, FILTER_VALIDATE_BOOLEAN);
                } elseif ($record->type === 'integer') {
                    $val = (int) $val;
                } elseif ($record->type === 'json') {
                    $val = json_decode($val, true);
                }
                $dict[$record->key] = $val;
            }

            return $dict;
        });
    }
}
