const backendDomain = "http://localhost:8080/api";

const backendApi = {

    signIn: `${backendDomain}/sign-in`,
    signOut: `${backendDomain}/sign-out`,

    lskResolver: `${backendDomain}/lsk/process-xml-upload`,

}

export default backendApi;
