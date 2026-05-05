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
                zIndex: '0',
                border: '1px solid #e1e3e5',
                backgroundColor: 'white'
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
        title: "Free",
        description: "Great for testing and basic customizations",
        monthlyPrice: "$0",
        monthlyPriceValue: 0,
        shopifyHandle: "free",
        features: [
            "Customer Feedback Survey",
            "Payment Methods Customizations",
            "Shipping Methods Customizations",
            "Discounts",
            "Checkout Branding"
        ]
    },
    {
        id: "starter",
        plan_id: "plan_starter_v1",
        title: "Starter",
        description: "Everything in Free, plus essential widgets",
        monthlyPrice: "$8",
        monthlyPriceValue: 8.00,
        shopifyHandle: "starter",
        features: [
            "Everything in free",
            "Progress Bar",
            "Free Shipping Bar",
            "Testimonials",
            "Motivational Quotes",
            "Single Line Text Field",
            "Builtin checkout branding templates"
        ]
    },
    {
        id: "growth",
        plan_id: "plan_growth_v1",
        title: "Growth",
        featuredText: "Most Popular",
        description: "Advanced features for growing stores",
        monthlyPrice: "$20",
        monthlyPriceValue: 20.00,
        shopifyHandle: "growth",
        features: [
            "Everything in starter",
            "Age Validator",
            "Address Blocker",
            "Appointment Picker",
            "Checkout Upsell (1)",
            "Post Purchase Upsells",
            "Custom Field (1)"
        ]
    },
    {
        id: "enterprise",
        plan_id: "plan_enterprise_v1",
        title: "Enterprise",
        description: "Full power with unlimited possibilities",
        monthlyPrice: "$40",
        monthlyPriceValue: 40.00,
        shopifyHandle: "enterprise",
        features: [
            "Everything in growth",
            "Unlimited checkout upsells",
            "Unlimited custom fields",
            "3rd Party App Integrations",
            "Analytics",
            "New Feature request"
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
            <s-stack direction="inline" gap="large" alignItems="start" justifyContent="start">
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
            </s-stack>
            <Footer />
        </s-page>
    );
}
