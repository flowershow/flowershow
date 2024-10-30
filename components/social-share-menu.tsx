"use client";
import Link from "next/link";
import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { LinkIcon } from "@heroicons/react/20/solid";
import { ArrowUpOnSquareIcon } from "@heroicons/react/24/outline";
import { transformObjectToParams } from "@/lib/transform-object-to-params";
import { socialIcons } from "@/components/social-icons";
import { toast } from "sonner";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function SocialShareMenu({
  shareTitle,
}: {
  shareTitle: string;
}) {
  const onCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const onShareClick = (link, text) => (e) => {
    e.preventDefault();
    window.open(link, text, "width=650,height=650");
  };

  const twitterShareLink =
    "https://twitter.com/intent/tweet" +
    transformObjectToParams({
      url: window.location.href,
      text: shareTitle,
      via: "datopian",
      // hashtags: categories.join(',') // TODO
    });

  const facebookShareLink =
    "https://www.facebook.com/sharer/sharer.php" +
    transformObjectToParams({
      u: window.location.href,
      quote: shareTitle,
    });

  const linkedInShareLink =
    "https://www.linkedin.com/sharing/share-offsite" +
    transformObjectToParams({
      url: window.location.href,
      title: shareTitle,
      source: "datopian",
    });

  const shareOptions = [
    {
      name: "Share on Twitter",
      icon: socialIcons.twitter,
      href: twitterShareLink,
      onClick: onShareClick(twitterShareLink, "Share on X"),
    },
    {
      name: "Share on LinkedIn",
      icon: socialIcons.linkedin,
      href: linkedInShareLink,
      onClick: onShareClick(linkedInShareLink, "Share on LinkedIn"),
    },
    {
      name: "Share on Facebook",
      icon: socialIcons.facebook,
      href: facebookShareLink,
      onClick: onShareClick(facebookShareLink, "Share on Facebook"),
    },
  ];
  return (
    <>
      <Menu as="div" className="relative flex text-left">
        <Menu.Button>
          <div className="flex items-center gap-1">
            <ArrowUpOnSquareIcon className="h-5 w-5" aria-hidden="true" />
            <span className="font-normal text-slate-600 hover:underline">
              Share
            </span>
          </div>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute left-0 z-10 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={onCopyClick}
                      className={classNames(
                        active ? "text-primary" : "text-slate-500",
                        "group flex items-center px-4 py-2 text-sm",
                      )}
                    >
                      <LinkIcon className="mr-3 h-5 w-5" aria-hidden="true" />
                      Copy link
                    </button>
                  )}
                </Menu.Item>
              </div>
              <div className="py-1">
                {shareOptions.map((option) => (
                  <Menu.Item key={option.name}>
                    {({ active }) => (
                      <Link
                        href={option.href}
                        onClick={option.onClick}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={classNames(
                          active ? "text-primary" : "text-slate-500",
                          "group flex items-center px-4 py-2 text-sm font-normal no-underline",
                        )}
                      >
                        <option.icon
                          className="mr-3 h-5 w-5"
                          aria-hidden="true"
                        />
                        {option.name}
                      </Link>
                    )}
                  </Menu.Item>
                ))}
              </div>
            </Menu.Items>
          </Transition>
        </Menu.Button>
      </Menu>
    </>
  );
}
