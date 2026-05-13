
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import { CircularProgress, Skeleton } from "@mui/material";

const Websites = () => {
  const navigate = useNavigate();
  const axios = useAxiosPrivate();

  const fetchTemplates = async () => {
    try {
      const response = await axios.get("/api/editor/get-websites");
      return response.data;
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const { data: templates = [], isPending: isTemplatesPending } = useQuery({
    queryKey: ["templates"],
    queryFn: fetchTemplates,
  });

  return (
    <div>
      <div className="p-4 flex flex-col gap-4">
        <div className="themePage-content-header bg-white flex flex-col gap-4">
          <h4 className="text-4xl text-left">Websites</h4>
          <hr />
        </div>

        {!isTemplatesPending ? (
          <div className="grid grid-cols-2 sm:grid-cols1 gap-6">
          

            {templates.map((template) => (
              <div key={template._id}>
                <div
                  onClick={() =>
                    navigate(
                      `/app/dashboard/frontend-dashboard/websites/${template.companyName}`,
                      {
                        state: {
                          website: template,
                          isLoading: isTemplatesPending,
                        },
                      }
                    )
                  }
                  className="relative group overflow-hidden shadow-lg rounded-xl cursor-pointer aspect-[16/9]"
                >
                  <img
                    src={template?.heroImages?.[0]?.url}
                    alt={template.companyName}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* subtle dark overlay for readability */}
                  <div className="absolute inset-0 bg-black/30" />

                  {/* centered title + subtitle */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
                    <h3 className="text-white font-semibold text-xl md:text-2xl drop-shadow-sm truncate w-full">
                      {template.title || template.companyName || "Untitled"}
                    </h3>
                    {template.subTitle ? (
                      <p className="mt-1 text-white/90 text-sm md:text-base drop-shadow-sm truncate w-full">
                        {template.subTitle}
                      </p>
                    ) : null}
                    {template.companyName ? (
                      <h2 className="mt-1 font-bold text-white/90 text-sm md:text-base drop-shadow-sm truncate w-full">
                        {template.companyName}
                      </h2>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols2 gap-2">
            <Skeleton variant="rectangular" width="100%" height={300} />
            <Skeleton variant="rectangular" width="100%" height={300} />
            <Skeleton variant="rectangular" width="100%" height={300} />
            <Skeleton variant="rectangular" width="100%" height={300} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Websites;
