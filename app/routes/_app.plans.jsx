import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
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

                    <s-stack direction="block" gap="base" style={{ marginTop: 'auto', paddingTop: '10px' }}>
                        <s-button {...button.props}>
                            {button.content}
                        </s-button>
                    </s-stack>
                </s-stack>
            </s-section>
        </div>
    );
};

export const PLANS = [
    {
        id: "starter",
        plan_id: "plan_starter_v1",
        edit_limit: 50,
        title: "Starter",
        description: "Best for new stores",
        monthlyPrice: "$8",
        monthlyPriceValue: 8.00,
        shopifyHandle: "starter",
        features: [
            "50 Order Edits / month",
            "Address & Phone Editing",
            "Order Cancellation",
            "Item Quantity & Swaps",
            "Add Products to Order",
            "Activity Logs & History",
            "Time & Tag Restrictions",
            "Invoice Downloads"
        ]
    },
    {
        id: "growth",
        plan_id: "plan_growth_v1",
        edit_limit: 100,
        title: "Growth",
        featuredText: "Recommended",
        description: "For growing businesses",
        monthlyPrice: "$20",
        monthlyPriceValue: 20.00,
        shopifyHandle: "growth",
        features: [
            "100 Order Edits / month",
            "Address & Phone Editing",
            "Order Cancellation",
            "Item Quantity & Swaps",
            "Add Products to Order",
            "Activity Logs & History",
            "Time & Tag Restrictions",
            "Invoice Downloads"
        ]
    },
    {
        id: "enterprise",
        plan_id: "plan_enterprise_v1",
        edit_limit: -1, // Unlimited
        title: "Enterprise",
        description: "Maximum power & scale",
        monthlyPrice: "$40",
        monthlyPriceValue: 40.00,
        shopifyHandle: "enterprise",
        features: [
            "Unlimited Order Edits",
            "Priority Support",
            "Custom Feature Requests",
            "Dedicated Account Manager",
            "Advanced Analytics",
            "Bulk Order Editing",
            "Multi-Store Support",
            "Early Access to Features"
        ]
    }
];

export default function PlansPage() {
    const { config } = useOutletContext();
    const [loading, setLoading] = useState("");
    const [planinfo, setplaninfo] = useState(null);
    const [planloading, setplanloading] = useState(true);

    const postPayment = async (plan) => {
        setLoading(plan.id);
        const test = true;
        let price = plan.monthlyPriceValue;

        const formData = new FormData();
        formData.append("_action", "POST_BILLING");
        formData.append("body", JSON.stringify({
            name: plan.shopifyHandle,
            planObject: plan,
            test: test,
            price: price,
            active: "Monthly",
            returnPath: window.location.pathname
        }));

        try {
            const response = await fetch('/app/fetch-data', {
                method: 'POST',
                body: formData
            });
            const res = await response.json();
            const result = res.data;

            if (plan.id === "free") {
                window.location.reload();
            } else if (result.confirmationUrl) {
                open(result.confirmationUrl, "_top");
            } else if (result.error) {
                if (typeof shopify !== 'undefined') shopify.toast.show(result.error, { isError: true });
                setLoading("");
            }
        } catch (error) {
            console.error("Payment error:", error);
            setLoading("");
        }
    };

    useEffect(() => {
        if (typeof shopify !== 'undefined') shopify.loading(true);
        setplanloading(true);

        const formData = new FormData();
        formData.append("_action", "GET_BILLING");

        fetch("/app/fetch-data", {
            method: "POST",
            body: formData
        })
            .then((res) => res.json())
            .then(res => {
                setplaninfo(res.data);
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
            {config?.limit_reached && (
                <s-box paddingBlockEnd="base">
                    <s-banner
                        heading="Monthly Edit Limit Reached"
                        tone="critical"
                    >
                        You have reached your monthly order edit limit. Please upgrade to a higher plan to re-enable order editing for your customers.
                    </s-banner>
                </s-box>
            )}
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
