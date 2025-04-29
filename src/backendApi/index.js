const backendDomain = "http://localhost:8080/api";

const backendApi = {

    signIn: `${backendDomain}/auth/signin`,
    signOut: `${backendDomain}/auth/signout`,


    lskResolver: `${backendDomain}/logical-seed-key/resolve`,
}

export default backendApi;

