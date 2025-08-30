export function shareContent(title, text, url) {

    if (navigator.share) {
        navigator.share({
            title: title || "Check this out!",
            text: text || "Here's something interesting.",
            url: url || window.location.href
        })
            .then(() => console.log("Content shared successfully!"))
            .catch((error) => console.error("Error sharing content:", error));
    } else {
        alert("Sharing is not supported on this device. Use the links below!");
    }
}

export function getShareLinks(url, text) {
    const encodedURL = encodeURIComponent(url || window.location.href);
    const encodedText = encodeURIComponent(text || "Check  this out!");

    return {
        xSocial: `https://x.com/intent/post?url=${encodedURL}&text=${encodedText}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedURL}`,
        whatsapp: `https://wa.me/?text=${encodedText}%20${encodedURL}`,
        email: `mailto:?subject=${encodedText}&body=${encodedURL}`
    }
}

if (typeof window !== "undefined") {
    window.shareContent = shareContent;
}