// Phase: Post-Phase 18 editor support refresh
package dev.vulci.jetbrains.icon;

import com.intellij.ide.FileIconProvider;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.IconLoader;
import com.intellij.openapi.vfs.VirtualFile;
import javax.swing.Icon;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

public final class VulciFileIconProvider implements FileIconProvider {
    private static final Icon VULCI_ICON =
            IconLoader.getIcon("/icons/vulci.svg", VulciFileIconProvider.class);

    @Override
    public @Nullable Icon getIcon(
            @NotNull VirtualFile file, int flags, @Nullable Project project) {
        String extension = file.getExtension();
        return extension != null && extension.equalsIgnoreCase("vci") ? VULCI_ICON : null;
    }
}
