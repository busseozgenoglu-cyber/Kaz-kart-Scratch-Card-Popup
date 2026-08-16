import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  AppProvider as PolarisAppProvider,
  Button,
  Card,
  FormLayout,
  Page,
  Text,
  TextField,
  BlockStack,
} from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { login } from "~/shopify.server";
import { loginErrorMessage } from "./error.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export async function loader({ request }: LoaderFunctionArgs) {
  const errors = loginErrorMessage(await login(request));
  return { errors, polarisTranslations: await translations() };
}

export async function action({ request }: ActionFunctionArgs) {
  const errors = loginErrorMessage(await login(request));
  return { errors, polarisTranslations: await translations() };
}

async function translations() {
  return (await import("@shopify/polaris/locales/en.json")).default;
}

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const errors = actionData?.errors || loaderData.errors;

  return (
    <PolarisAppProvider i18n={loaderData.polarisTranslations}>
      <Page>
        <Card>
          <Form method="post">
            <FormLayout>
              <BlockStack gap="200">
                <Text as="h1" variant="headingLg">
                  ScratchCart'ı yükleyin
                </Text>
                <Text as="p" tone="subdued">
                  Devam etmek için mağaza adresinizi girin.
                </Text>
              </BlockStack>
              <TextField
                type="text"
                name="shop"
                label="Mağaza adresi"
                value={shop}
                onChange={setShop}
                autoComplete="on"
                placeholder="magaza-adi.myshopify.com"
                error={errors.shop}
              />
              <Button submit variant="primary">
                Devam et
              </Button>
            </FormLayout>
          </Form>
        </Card>
      </Page>
    </PolarisAppProvider>
  );
}
