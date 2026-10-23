<?php

namespace App\Notifications;

use App\Domain\Organizations\Models\Organization;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** "You have been added to …", with a set-password link when the person has no account yet. */
class MemberInvited extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Organization $organization,
        public readonly ?string $token,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $locale = $notifiable->locale;
        $base = rtrim((string) config('app.frontend_url'), '/')."/{$locale}";
        $url = $this->token === null
            ? "{$base}/login"
            : "{$base}/invitation?".http_build_query(['token' => $this->token, 'email' => $notifiable->email]);

        return (new MailMessage)
            ->subject(__('You have been invited to :organization', ['organization' => $this->organization->name], $locale))
            ->greeting(__('Hello :name,', ['name' => $notifiable->name], $locale))
            ->line(__(':organization added you to its team on MNT.', ['organization' => $this->organization->name], $locale))
            ->action($this->token === null ? __('Sign in', [], $locale) : __('Choose my password', [], $locale), $url)
            ->line($this->token === null ? '' : __('This link is valid for 7 days.', [], $locale));
    }
}
