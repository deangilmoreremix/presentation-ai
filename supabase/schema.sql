--
-- PostgreSQL database dump
--

\restrict D2zTdLeOGA8WCFbsdIfD3ZX0oOl3nh9FQFYe8p0UdeGXBDDHms0lzGtQ71aYByC

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: document_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_type AS ENUM (
    'NOTE',
    'DOCUMENT',
    'DRAWING',
    'DESIGN',
    'STICKY_NOTES',
    'MIND_MAP',
    'RESEARCH_PAPER',
    'FLIPBOOK',
    'PRESENTATION'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'ADMIN',
    'USER'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.users (id, email, name, image, role, has_access)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'avatar_url',
    'USER',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: base_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.base_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    type public.document_type NOT NULL,
    document_type text DEFAULT 'presentation'::text NOT NULL,
    thumbnail_url text,
    user_id uuid NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE base_documents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.base_documents IS 'Base table for all document-like entities. Presentations, notes, etc. Each may have a 1:1 presentations row.';


--
-- Name: favorite_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorite_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    document_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE favorite_documents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.favorite_documents IS 'Starred documents. unique(user_id, document_id) makes the toggle idempotent.';


--
-- Name: favorite_presentation_themes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorite_presentation_themes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    theme_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE favorite_presentation_themes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.favorite_presentation_themes IS 'One row per (user, theme) favourite. The unique constraint makes the toggle idempotent.';


--
-- Name: font_pairs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.font_pairs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    heading text NOT NULL,
    heading_url text,
    heading_weight integer DEFAULT 700 NOT NULL,
    body text NOT NULL,
    body_url text,
    body_weight integer DEFAULT 400 NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE font_pairs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.font_pairs IS 'User-saved font pairings for presentations.';


--
-- Name: generated_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generated_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    url text NOT NULL,
    prompt text NOT NULL,
    user_id uuid NOT NULL,
    model text,
    size text,
    quality text,
    format text,
    compression integer,
    background text,
    action text,
    previous_response_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE generated_images; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.generated_images IS 'AI-generated images persisted per user.';


--
-- Name: presentation_theme_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presentation_theme_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    theme_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE presentation_theme_likes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.presentation_theme_likes IS 'One row per (user, theme) like. The unique constraint makes the toggle idempotent.';


--
-- Name: presentation_themes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presentation_themes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    theme_data jsonb NOT NULL,
    logo_url text,
    is_public boolean DEFAULT false NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE presentation_themes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.presentation_themes IS 'Custom and system themes. is_public drives public gallery; is_admin marks seeded/system themes.';


--
-- Name: presentations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presentations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    content jsonb,
    theme text DEFAULT 'mystique'::text NOT NULL,
    image_source text,
    presentation_style text,
    customization jsonb,
    language text,
    outline text[],
    prompt text,
    search_results jsonb,
    tool_calls jsonb,
    selected_chunks jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE presentations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.presentations IS 'Presentation-specific payload, 1:1 with base_documents via document_id.';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    name text,
    email text,
    image text,
    role public.user_role DEFAULT 'USER'::public.user_role NOT NULL,
    has_access boolean DEFAULT false NOT NULL,
    headline text,
    bio text,
    interests text[],
    location text,
    website text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'Application user profile. One row per auth.users row, created by handle_new_user().';


--
-- Name: base_documents base_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.base_documents
    ADD CONSTRAINT base_documents_pkey PRIMARY KEY (id);


--
-- Name: favorite_documents favorite_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_documents
    ADD CONSTRAINT favorite_documents_pkey PRIMARY KEY (id);


--
-- Name: favorite_documents favorite_documents_user_id_document_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_documents
    ADD CONSTRAINT favorite_documents_user_id_document_id_key UNIQUE (user_id, document_id);


--
-- Name: favorite_presentation_themes favorite_presentation_themes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_presentation_themes
    ADD CONSTRAINT favorite_presentation_themes_pkey PRIMARY KEY (id);


--
-- Name: favorite_presentation_themes favorite_presentation_themes_user_id_theme_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_presentation_themes
    ADD CONSTRAINT favorite_presentation_themes_user_id_theme_id_key UNIQUE (user_id, theme_id);


--
-- Name: font_pairs font_pairs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.font_pairs
    ADD CONSTRAINT font_pairs_pkey PRIMARY KEY (id);


--
-- Name: generated_images generated_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_images
    ADD CONSTRAINT generated_images_pkey PRIMARY KEY (id);


--
-- Name: presentation_theme_likes presentation_theme_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presentation_theme_likes
    ADD CONSTRAINT presentation_theme_likes_pkey PRIMARY KEY (id);


--
-- Name: presentation_theme_likes presentation_theme_likes_user_id_theme_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presentation_theme_likes
    ADD CONSTRAINT presentation_theme_likes_user_id_theme_id_key UNIQUE (user_id, theme_id);


--
-- Name: presentation_themes presentation_themes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presentation_themes
    ADD CONSTRAINT presentation_themes_pkey PRIMARY KEY (id);


--
-- Name: presentations presentations_document_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presentations
    ADD CONSTRAINT presentations_document_id_key UNIQUE (document_id);


--
-- Name: presentations presentations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presentations
    ADD CONSTRAINT presentations_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: base_documents_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX base_documents_type_idx ON public.base_documents USING btree (type);


--
-- Name: base_documents_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX base_documents_user_id_idx ON public.base_documents USING btree (user_id);


--
-- Name: favorite_documents_document_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX favorite_documents_document_id_idx ON public.favorite_documents USING btree (document_id);


--
-- Name: favorite_documents_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX favorite_documents_user_id_idx ON public.favorite_documents USING btree (user_id);


--
-- Name: favorite_presentation_themes_theme_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX favorite_presentation_themes_theme_id_idx ON public.favorite_presentation_themes USING btree (theme_id);


--
-- Name: favorite_presentation_themes_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX favorite_presentation_themes_user_id_idx ON public.favorite_presentation_themes USING btree (user_id);


--
-- Name: font_pairs_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX font_pairs_user_id_idx ON public.font_pairs USING btree (user_id);


--
-- Name: generated_images_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX generated_images_user_id_idx ON public.generated_images USING btree (user_id);


--
-- Name: presentation_theme_likes_theme_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX presentation_theme_likes_theme_id_idx ON public.presentation_theme_likes USING btree (theme_id);


--
-- Name: presentation_theme_likes_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX presentation_theme_likes_user_id_idx ON public.presentation_theme_likes USING btree (user_id);


--
-- Name: presentation_themes_is_admin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX presentation_themes_is_admin_idx ON public.presentation_themes USING btree (is_admin);


--
-- Name: presentation_themes_is_public_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX presentation_themes_is_public_idx ON public.presentation_themes USING btree (is_public);


--
-- Name: presentation_themes_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX presentation_themes_user_id_idx ON public.presentation_themes USING btree (user_id);


--
-- Name: presentations_document_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX presentations_document_id_idx ON public.presentations USING btree (document_id);


--
-- Name: base_documents set_updated_at_base_documents; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_base_documents BEFORE UPDATE ON public.base_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: font_pairs set_updated_at_font_pairs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_font_pairs BEFORE UPDATE ON public.font_pairs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: generated_images set_updated_at_generated_images; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_generated_images BEFORE UPDATE ON public.generated_images FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: presentation_themes set_updated_at_presentation_themes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_presentation_themes BEFORE UPDATE ON public.presentation_themes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: presentations set_updated_at_presentations; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_presentations BEFORE UPDATE ON public.presentations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users set_updated_at_users; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: base_documents base_documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.base_documents
    ADD CONSTRAINT base_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: favorite_documents favorite_documents_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_documents
    ADD CONSTRAINT favorite_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.base_documents(id) ON DELETE CASCADE;


--
-- Name: favorite_documents favorite_documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_documents
    ADD CONSTRAINT favorite_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: favorite_presentation_themes favorite_presentation_themes_theme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_presentation_themes
    ADD CONSTRAINT favorite_presentation_themes_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.presentation_themes(id) ON DELETE CASCADE;


--
-- Name: favorite_presentation_themes favorite_presentation_themes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_presentation_themes
    ADD CONSTRAINT favorite_presentation_themes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: font_pairs font_pairs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.font_pairs
    ADD CONSTRAINT font_pairs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: generated_images generated_images_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_images
    ADD CONSTRAINT generated_images_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: presentation_theme_likes presentation_theme_likes_theme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presentation_theme_likes
    ADD CONSTRAINT presentation_theme_likes_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.presentation_themes(id) ON DELETE CASCADE;


--
-- Name: presentation_theme_likes presentation_theme_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presentation_theme_likes
    ADD CONSTRAINT presentation_theme_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: presentation_themes presentation_themes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presentation_themes
    ADD CONSTRAINT presentation_themes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: presentations presentations_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presentations
    ADD CONSTRAINT presentations_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.base_documents(id) ON DELETE CASCADE;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: base_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.base_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: base_documents base_documents_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY base_documents_delete_owner ON public.base_documents FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: base_documents base_documents_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY base_documents_insert_owner ON public.base_documents FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: base_documents base_documents_select_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY base_documents_select_owner ON public.base_documents FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: base_documents base_documents_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY base_documents_select_public ON public.base_documents FOR SELECT USING ((is_public = true));


--
-- Name: base_documents base_documents_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY base_documents_update_owner ON public.base_documents FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: favorite_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorite_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: favorite_documents favorite_documents_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY favorite_documents_delete ON public.favorite_documents FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: favorite_documents favorite_documents_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY favorite_documents_insert ON public.favorite_documents FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: favorite_documents favorite_documents_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY favorite_documents_select ON public.favorite_documents FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: favorite_presentation_themes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorite_presentation_themes ENABLE ROW LEVEL SECURITY;

--
-- Name: favorite_presentation_themes favorite_presentation_themes_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY favorite_presentation_themes_delete ON public.favorite_presentation_themes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: favorite_presentation_themes favorite_presentation_themes_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY favorite_presentation_themes_insert ON public.favorite_presentation_themes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: favorite_presentation_themes favorite_presentation_themes_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY favorite_presentation_themes_select ON public.favorite_presentation_themes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: font_pairs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.font_pairs ENABLE ROW LEVEL SECURITY;

--
-- Name: font_pairs font_pairs_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY font_pairs_delete ON public.font_pairs FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: font_pairs font_pairs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY font_pairs_insert ON public.font_pairs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: font_pairs font_pairs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY font_pairs_select ON public.font_pairs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: font_pairs font_pairs_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY font_pairs_update ON public.font_pairs FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: generated_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

--
-- Name: generated_images generated_images_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY generated_images_delete ON public.generated_images FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: generated_images generated_images_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY generated_images_insert ON public.generated_images FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: generated_images generated_images_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY generated_images_select ON public.generated_images FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: generated_images generated_images_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY generated_images_update ON public.generated_images FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: presentation_theme_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.presentation_theme_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: presentation_theme_likes presentation_theme_likes_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presentation_theme_likes_delete ON public.presentation_theme_likes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: presentation_theme_likes presentation_theme_likes_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presentation_theme_likes_insert ON public.presentation_theme_likes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: presentation_theme_likes presentation_theme_likes_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presentation_theme_likes_select ON public.presentation_theme_likes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: presentation_themes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.presentation_themes ENABLE ROW LEVEL SECURITY;

--
-- Name: presentation_themes presentation_themes_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presentation_themes_delete ON public.presentation_themes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: presentation_themes presentation_themes_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presentation_themes_insert ON public.presentation_themes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: presentation_themes presentation_themes_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presentation_themes_select ON public.presentation_themes FOR SELECT USING (((is_public = true) OR (is_admin = true) OR (auth.uid() = user_id)));


--
-- Name: presentation_themes presentation_themes_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presentation_themes_update ON public.presentation_themes FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: presentations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;

--
-- Name: presentations presentations_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presentations_delete ON public.presentations FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.base_documents bd
  WHERE ((bd.id = presentations.document_id) AND (bd.user_id = auth.uid())))));


--
-- Name: presentations presentations_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presentations_insert ON public.presentations FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.base_documents bd
  WHERE ((bd.id = presentations.document_id) AND (bd.user_id = auth.uid())))));


--
-- Name: presentations presentations_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presentations_select ON public.presentations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.base_documents bd
  WHERE ((bd.id = presentations.document_id) AND ((bd.user_id = auth.uid()) OR (bd.is_public = true))))));


--
-- Name: presentations presentations_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presentations_update ON public.presentations FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.base_documents bd
  WHERE ((bd.id = presentations.document_id) AND (bd.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.base_documents bd
  WHERE ((bd.id = presentations.document_id) AND (bd.user_id = auth.uid())))));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_select_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_self ON public.users FOR SELECT USING ((auth.uid() = id));


--
-- Name: users users_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_self ON public.users FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- PostgreSQL database dump complete
--

\unrestrict D2zTdLeOGA8WCFbsdIfD3ZX0oOl3nh9FQFYe8p0UdeGXBDDHms0lzGtQ71aYByC

