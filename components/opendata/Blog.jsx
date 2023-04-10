import { Swiper, SwiperSlide } from "swiper/react";

export default function Blog() {
  const blogPost = [
    {
      tag: "DATAHUB OPENGOV",
      eta: "6min read",
      title: "What is DataHub OpenGov?",
      img: "/static/img/opengov/blog-1.png",
      creationUser: "Anuar Ustayev",
      creationAvatar: "/static/img/opengov/blog-avatar.png",
      creationDate: "Sep 6,2022",
    },
    {
      tag: "DATAHUB OPENGOV",
      eta: "6min read",
      title: "DataHub OpenGov: Your data partner",
      img: "/static/img/opengov/blog-2.png",
      creationUser: "Anuar Ustayev",
      creationAvatar: "/static/img/opengov/blog-avatar.png",
      creationDate: "Sep 6,2022",
    },
    {
      tag: "DATAHUB OPENGOV",
      eta: "6min read",
      title: "DataHub OpenGov: Take your open data to the next level",
      img: "/static/img/opengov/blog-3.png",
      creationUser: "Anuar Ustayev",
      creationAvatar: "/static/img/opengov/blog-avatar.png",
      creationDate: "Sep 6,2022",
    },
  ];

  const tags = [
    "DATAHUB OPENGOV",
    "DATA ENGINEERING",
    "PRODUCT UPDATES",
    "COMPANY NEWS",
    "TEAM & CULTURE",
    "DATA STRATEGY",
    "CKAN",
  ];

  return (
    <section className="flex justify-center mt-24">
      <div className="xl:max-w-7xl lg:max-w-5xl md:max-w-2xl sm:max-w-xl max-w-md text-center font-['Poppins'] w-full">
        <h2 className="text-4xl font-bold">FROM THE BLOG</h2>
        <p className="text-xl mt-6 text-[#6B7280]">
          Recent articles about DataHub City on our blog
        </p>
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-6 mt-12">
            {blogPost.map((post) => (
              <article
                key={post.title}
                className="flex justify-center rounded-lg border-gray-300 border-1"
              >
                <div className="flex flex-col min-h-[32rem] justify-start">
                  <img
                    src={post.img}
                    alt="Blog Post Image"
                    className="rounded-t-lg"
                  />
                  <div className="p-4 text-[#1A202E]">
                    <div className="flex items-center gap-4 mt-4">
                      <p className="text-[#457EFF]">{post.tag}</p>
                      <p className="bg-[#EBEEF2] max-h-8 fit text-[#495367] px-3">
                        {post.eta}
                      </p>
                    </div>
                    <h5 className="text-2xl text-start text-extrabold my-3 h-16 line-clamp-2">
                      {post.title}
                    </h5>
                    <p className="text-justify">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit,
                      sed do eiusmod tempor incididunt ut labore et dolore magna
                      aliqua.
                    </p>
                  </div>
                  <div className="flex p-3 border-gray-300 border-1">
                    <img
                      src={post.creationAvatar}
                      alt="Post User Avatar"
                      className="w-16 mr-4 pr-4  "
                    />
                    <div className="text-left">
                      <p className="text-gray-500">{post.creationUser}</p>
                      <p className="text-gray-300">{post.creationDate}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
        <h5 className="text-left text-xl font-semibold mt-4 mb-3">
          Discover More Topics
        </h5>
        <Swiper
          className="mt-6"
          spaceBetween={120}
          breakpoints={{
            1: {
              slidesPerView: 2,
            },
            420: {
              slidesPerView: 2,
            },
            500: {
              slidesPerView: 3,
            },
            768: {
              slidesPerView: 4,
            },
            1024: {
              slidesPerView: 5,
            },
            1280: {
              slidesPerView: 6,
            },
          }}
        >
          {tags.map((tag) => (
            <SwiperSlide key={tag}>
              <button className="border border-2 text-sm text-[#1A202E] rounded-lg py-5 px-6 font-mono whitespace-nowrap w-48 text-center hover:bg-green-500 hover:text-white">
                {tag}
              </button>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
