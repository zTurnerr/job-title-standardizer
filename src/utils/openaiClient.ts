interface JobTitle {
    title: string;
    department: string;
    function: string;
    seniority: string;
}

export const openaiClient = {
    classifyJobTitles: async (jobTitles: string[]): Promise<JobTitle[]> => {
      console.log("Mocking OpenAI API classification...");
      // Mock response
      return jobTitles.map(title => ({
        title,
        department: "Engineering",
        function: "Software Development",
        seniority: "Mid-Level",
      }));
    },
  };
  