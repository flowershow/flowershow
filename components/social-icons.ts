import { DiscordIcon } from "@/components/icons/discord";
import { SocialPlatform } from "@/components/types";
import {
  FacebookIcon,
  GithubIcon,
  InstagramIcon,
  LinkedinIcon,
  TwitterIcon,
  YoutubeIcon,
} from "lucide-react";

export const socialIcons: { [K in SocialPlatform]: React.FC<any> } = {
  discord: DiscordIcon,
  github: GithubIcon,
  linkedin: LinkedinIcon,
  twitter: TwitterIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  youtube: YoutubeIcon,
};
