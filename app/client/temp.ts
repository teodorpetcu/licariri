

const uploadImage = async (imageID: string, image: File) => {
    const formData = new FormData();
    const action = "/admin/images/" + imageID;
    formData.append("file", image)
    await fetch(action, {
        method: "post",
        headers: {
            "Accepts": "application/json",
        },
        body: formData,
    });
}
