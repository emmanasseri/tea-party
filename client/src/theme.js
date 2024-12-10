import { extendTheme } from "@chakra-ui/react";
import { color } from "framer-motion";

const theme = extendTheme({
  fonts: {
    heading: '"Higuen Elegent", serif', // Use for headings
    body: '"Nunito", sans-serif', // Use for body text
  },

  styles: {
    global: {
      "html, body": {
        color: "#013780",
      },
    },
  },
  components: {
    Heading: {
      baseStyle: {
        fontSize: "xl", // Now using 'xl' for all headings by default
        fontWeight: "900",
        color: "#013780",
      },
    },
    body: {
      baseStyle: {
        fontSize: "lg", // Now using 'lg' for all body text by default
        color: "#013780",
      },
    },
  },
});

export default theme;
