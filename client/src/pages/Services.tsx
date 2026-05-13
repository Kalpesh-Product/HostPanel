import { Box, Checkbox, FormHelperText } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import PrimaryButton from "../components/PrimaryButton";
import useAuth from "../hooks/useAuth";
import useAxiosPrivate from "../hooks/useAxiosPrivate";

type ServicesFormValues = {
  selectedServices: string[];
};

const Services = () => {
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset } = useForm<ServicesFormValues>({
    defaultValues: {
      selectedServices: [],
    },
  });
  const axios = useAxiosPrivate();
  const { auth } = useAuth();

  const companyId = auth?.user?.companyId || "CMP0001";

  const { data: servicesData } = useQuery({
    queryKey: ["services", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const res = await axios.get(
        `/api/services/get-services?companyId=${companyId}`,
      );
      return res.data;
    },
  });

  useEffect(() => {
    if (servicesData?.selectedServices) {
      const { defaults = [], apps = [], modules = [] } = servicesData.selectedServices;

      const activeDefaults = defaults
        .filter((d: any) => d.isRequested)
        .map(() => "Website Builder");
      const activeApps = apps.filter((a: any) => a.isRequested).map((a: any) => a.appName);
      const activeModules = modules
        .filter((m: any) => m.isRequested)
        .map((m: any) => m.moduleName);

      reset({
        selectedServices: [...activeDefaults, ...activeApps, ...activeModules],
      });
    }
  }, [servicesData, reset]);

  const { mutate: register, isPending: isRegisterLoading } = useMutation({
    mutationFn: async (fd: any) => {
      const response = await axios.patch("/api/services/request-services", fd);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Services submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["services", companyId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Something went wrong");
    },
  });

  const serviceOptions = [
    {
      category: "Addon Apps (Coming Soon)",
      items: ["Tickets", "Meetings", "Tasks", "Performance", "Visitors", "Assets"],
    },
    {
      category: "Addon Modules (Coming Soon)",
      items: ["Finance", "Sales", "HR", "Admin", "Maintenance", "IT"],
    },
  ];

  const mandatoryServices = ["Website Builder", "Lead Generation", "Automated Google Sheets"];

  const onSubmit = (data: ServicesFormValues) => {
    const apps = data.selectedServices
      .filter((service) => serviceOptions[0].items.includes(service))
      .map((app) => ({ appName: app, isRequested: true }));

    const modules = data.selectedServices
      .filter((service) => serviceOptions[1].items.includes(service))
      .map((mod) => ({ moduleName: mod, isRequested: true }));

    register({
      companyId,
      selectedServices: { apps, modules },
    });
  };

  return (
    <div className="p-4">
      <h2 className="font-pmedium text-title text-primary ">
        Please Select Your Services
      </h2>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Controller
          name="selectedServices"
          control={control}
          render={({ field, fieldState }) => {
            const valueWithMandatory = Array.from(
              new Set([...(field.value || []), ...mandatoryServices]),
            );

            const renderCard = (service: string, isMandatory: boolean) => {
              const isSelected = valueWithMandatory.includes(service);
              const isPreSelected =
                servicesData?.selectedServices &&
                (servicesData.selectedServices.apps?.some(
                  (a: any) => a.appName === service && a.isRequested,
                ) ||
                  servicesData.selectedServices.modules?.some(
                    (m: any) => m.moduleName === service && m.isRequested,
                  ) ||
                  mandatoryServices.includes(service));

              const handleToggle = () => {
                if (isMandatory || isPreSelected) return;
                const newValue = isSelected
                  ? valueWithMandatory.filter((s) => s !== service)
                  : [...valueWithMandatory, service];

                field.onChange(newValue);
              };

              return (
                <Box
                  key={service}
                  onClick={handleToggle}
                  sx={{
                    border: "1px solid",
                    borderColor: isSelected ? "primary.main" : "divider",
                    borderRadius: 2,
                    p: 2,
                    cursor: isMandatory || isPreSelected ? "not-allowed" : "pointer",
                    userSelect: "none",
                    boxShadow: isSelected ? 3 : 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: isMandatory || isPreSelected ? 0.8 : 1,
                  }}
                >
                  <span className="font-medium">{service}</span>
                  <Checkbox
                    checked={isSelected}
                    disabled={isMandatory || isPreSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggle();
                    }}
                  />
                </Box>
              );
            };

            return (
              <Box sx={{ mt: 2 }} className="col-span-1 lg:col-span-2">
                <h3 className="font-semibold mb-2">Your Activated Services</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                  {mandatoryServices.map((service) => renderCard(service, true))}
                </div>

                {serviceOptions.map((group) => (
                  <Box key={group.category} sx={{ mb: 4 }}>
                    <h3 className="font-semibold mb-2">{group.category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.items.map((service) => renderCard(service, false))}
                    </div>
                  </Box>
                ))}

                {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
              </Box>
            );
          }}
        />

        <div className="flex justify-center items-center mt-6">
          <PrimaryButton
            externalStyles=""
            title="Submit"
            type="submit"
            isPending={isRegisterLoading}
            disabled={isRegisterLoading}
          />
        </div>
      </form>
    </div>
  );
};

export default Services;