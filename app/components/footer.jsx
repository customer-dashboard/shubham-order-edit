import { Box, Text, InlineStack } from "@shopify/polaris";

export default function Footer() {
  return (
    <Box paddingBlock="400">
      <InlineStack align="center">
        <Text variant="bodySm" as="p" tone="subdued">
          &copy; {new Date().getFullYear()} Order Edit. All rights reserved.
        </Text>
      </InlineStack>
    </Box>
  );
}
