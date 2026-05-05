import { useEffect, useState } from "react";
import Footer from "../components/footer";

export const PricingCard = ({
    title,
    description,
    price,
    features,
    featuredText,
    button,
    frequency
}) => {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                boxShadow: featuredText ? '0px 0px 15px 4px #CDFEE1' : 'none',
                borderRadius: '.75rem',
                position: 'relative',
                zIndex: '0'
            }}
        >
            {featuredText ? (
                <div style={{ position: 'absolute', top: '-15px', right: '6px', zIndex: '100' }}>
                    <s-badge tone="success">
                        {featuredText}
                    </s-badge>
                </div>
            ) : null}
            <s-section padding="base" style={{ height: '100%', display: 'flex' }}>
                <s-stack direction="block" gap="large" style={{ flex: 1 }}>
                    <s-stack direction="block" gap="base" alignItems="start">
                        <h1 style={{ fontSize: "20px", fontWeight: "bold" }}>
                            {title}
                        </h1>
                        {description ? (
                            <s-paragraph color="subdued">
                                {description}
                            </s-paragraph>
                        ) : null}
                    </s-stack>

                    <s-stack direction="inline" gap="small-400" alignItems="baseline">
                        <h2 style={{ fontSize: "28px", fontWeight: "bold" }}>
                            {price}
                        </h2>
                        <s-text>
                            / {frequency}
                        </s-text>
                    </s-stack>

                    <s-stack direction="block" gap="small-400">
                        {features?.map((feature, id) => (
                            <s-text color="subdued" key={id}>
                                {feature}
                            </s-text>
                        ))}
                    </s-stack>

                    <div style={{ marginTop: 'auto', textAlign: 'right' }}>
                        <s-button {...button.props}>{button.content}</s-button>
                    </div>
                </s-stack>
            </s-section>
        </div>
    );
};

const PLANS = [
    {
        id: "free",
        plan_id: "plan_free_v1",
        edit_limit: -1, // Unlimited
        title: "Development",
        description: "For testing on development stores",
        monthlyPrice: "Free",
        monthlyPriceValue: 0,
        shopifyHandle: "free",
        features: [
            "Unlimited Order Edits",
            "Shipping Address Editing",
            "Phone Number Editing",
            "Order Line Items Editing",
            "Adding More Products",
            "Discount Code & Invoices",
            "All Restrictions unlocked"
        ]
    },
    {
        id: "starter",
        plan_id: "plan_starter_v1",
        edit_limit: 50,
        title: "Starter",
        description: "Perfect for small stores",
        monthlyPrice: "$8",
        monthlyPriceValue: 8.00,
        shopifyHandle: "starter",
        features: [
            "50 Order Edits / month",
            "Shipping Address Editing",
            "Phone Number Editing",
            "Delivery Instructions",
            "Time Limit Restriction",
            "Order Tags Restriction",
            "Standard Support"
        ]
    },
    {
        id: "growth",
        plan_id: "plan_growth_v1",
        edit_limit: 100,
        title: "Growth",
        featuredText: "Best Value",
        description: "For growing stores",
        monthlyPrice: "$20",
        monthlyPriceValue: 20.00,
        shopifyHandle: "growth",
        features: [
            "100 Order Edits / month",
            "Everything in Starter",
            "Order Line Items Editing",
            "Adding More Products",
            "Discount Code Editing",
            "Customer Tags Restriction",
            "Priority Support"
        ]
    },
    {
        id: "enterprise",
        plan_id: "plan_enterprise_v1",
        edit_limit: -1, // Unlimited
        title: "Enterprise",
        description: "Full power for high volume",
        monthlyPrice: "$40",
        monthlyPriceValue: 40.00,
        shopifyHandle: "enterprise",
        features: [
            "Unlimited Order Edits",
            "Everything in Growth",
            "Invoice Download",
            "Product Tags Restriction",
            "Custom Feature Requests",
            "Dedicated Account Manager"
        ]
    }
];

export default function PlansPage() {
    const [planloading, setplanloading] = useState(false);
    const [planinfo, setplaninfo] = useState({});
    const [loading, setLoading] = useState("");

    const queryParameters = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : "");
    const myappplan = queryParameters.get("myappplan");
    const customplan = queryParameters.get("customplan");

    let test = !!myappplan;

    const postPayment = async (plan) => {
        setLoading(plan.id);
        let price = plan.monthlyPriceValue;
        let iscustomplan = false;
        let onboarding = false;

        if (customplan) {
            price = Number(customplan);
            iscustomplan = true;
        }

        try {
            const response = await fetch('/api/post-billing', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: plan.shopifyHandle,
                    planObject: plan,
                    shop: typeof shopify !== 'undefined' ? shopify.config.shop : "",
                    test: test,
                    price: price,
                    active: "Monthly",
                    iscustomplan,
                    onboarding,
                    returnPath: window.location.pathname
                })
            });
            const result = await response.json();

            if (plan.id === "free") {
                window.location.reload();
            } else if (result.data) {
                open(result.data, "_top");
            } else if (result.error) {
                if (typeof shopify !== 'undefined') shopify.toast.show(result.error, { isError: true });
                setLoading("");
            }
        } catch (err) {
            console.error("Payment error:", err);
            setLoading("");
        }
    };

    useEffect(() => {
        if (typeof shopify !== 'undefined') shopify.loading(true);
        shopify.loading(true);
        setplanloading(true);

        fetch("/api/get-billing")
            .then((res) => res.json())
            .then(data => {
                setplaninfo(data);
            })
            .catch(err => console.error("Fetch billing error:", err))
            .finally(() => {
                if (typeof shopify !== 'undefined') shopify.loading(false);
                setplanloading(false);
            });
    }, []);

    if (planloading) {
        return null
    }

    return (
        <s-page heading="Plans">
            <s-grid gap="base" gridTemplateColumns="1fr 1fr 1fr">
                {PLANS.map((plan) => (
                    <PricingCard
                        key={plan.id}
                        title={plan.title}
                        description={plan.description}
                        price={plan.monthlyPrice}
                        frequency="month"
                        features={plan.features}
                        featuredText={plan.featuredText}
                        button={{
                            content: planinfo?.name === plan.shopifyHandle ? "Current plan" : "Select plan",
                            props: {
                                variant: planinfo?.name === plan.shopifyHandle ? "secondary" : "primary",
                                disabled: planinfo?.name === plan.shopifyHandle,
                                loading: loading === plan.id,
                                onClick: () => postPayment(plan),
                            },
                        }}
                    />
                ))}
            </s-grid>
            <Footer />
        </s-page>
    );
}
