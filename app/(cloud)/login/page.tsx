import { Metadata } from 'next';
import Image from 'next/image';
import { Suspense } from 'react';
import { getConfig } from '@/lib/app-config';
import LoginButton from './_components/login-button';

const config = getConfig();

export const metadata: Metadata = {
  title: 'Login',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col justify-center py-12 font-dashboard-body sm:px-6 lg:px-8">
      <div className="mx-5 border border-primary-faint p-10 sm:mx-auto sm:w-full sm:max-w-md sm:rounded-lg sm:shadow-md md:max-w-lg md:p-12">
        <Image
          alt={`${config.title} logo`}
          width={48}
          height={48}
          className="relative mx-auto w-auto"
          src={config.logo}
        />
        <h1 className="mt-6 text-center font-dashboard-heading text-3xl">
          {config.title}
        </h1>
        <p className="mt-2 text-center text-sm">
          Turn your markdown into a website in a couple of clicks. <br />
        </p>

        <div className="mt-4">
          <Suspense
            fallback={
              <div className="my-2 h-10 w-full rounded-md border border-primary-faint bg-primary-faint" />
            }
          >
            <LoginButton />
          </Suspense>
          <p className="mt-2 text-center text-xs">
            By registering, you agree to our
            <a
              className="font-medium hover:text-primary-subtle"
              href={config.termsOfService}
              target="_blank"
            >
              {' '}
              Terms of Service.
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
